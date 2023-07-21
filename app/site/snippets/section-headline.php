<section class="section__headline">
	<h1 data-value="<?= $page->headline()->or($page->title())->esc() ?>" >
		<?php // Split headline into two rows with approx. same number of words
			$title = $page->headline()->or($page->title())->esc();
			$title_words = explode( " ", $title );
			$title_length = count( $title_words ); 
			$title_chunk = array_chunk( $title_words, ceil( $title_length / 2 ) );
			echo implode( " ", $title_chunk[0] );
			if ( array_key_exists( '1', $title_chunk )) {
                echo "<br />"; 
			    echo implode( " ", $title_chunk[1] ); 
            }
		?>
	</h1>
</section>